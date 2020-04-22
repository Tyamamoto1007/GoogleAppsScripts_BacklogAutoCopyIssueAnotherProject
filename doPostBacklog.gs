//BacklogのWebhook機能を利用して、各サイトのプロジェクトに課題追加時にタスク管理のプロジェクトに自動的に課題を登録する機能です。
//定期的にスケジュール実行で転記元の課題情報を参照し、件名や開始日、締切日、状態に変更があった場合は、転記先も更新する機能もあります。

//事前条件1 BacklogのAPIを利用できるように、Backlogのユーザー個人設定からAPIキーを発行
//事前条件2 メニュー「ファイル＞プロジェクトのプロパティ」のスクリプトプロパティタブで「プロパティ:BACKLOG_API_KEY、値：事前条件1で控えた値」を入力
//事前条件3 Googleスプレッドシートを新規作成、シート名を「BacklogSetting」に名前変更する。Backlogユーザー名(A列)とメンバーID(B列)の対応表入力。スプレッドシートURL欄の「~d/○○/edit#~」の○○を控えておく
//事前条件4スプレッドシートのG1~L2列までにワークスペースURLやプロジェクトID、タスク種別、優先度のデフォルトを設定します。
//事前条件5 メニュー「ファイル＞プロジェクトのプロパティ」のスクリプトプロパティタブで「プロパティ:SHEET_ID、値：事前条件3で控えた値」を入力

//事後設定1 メニュー「公開＞Webアプリケーション導入」で、バージョン:New、次のユーザーとしてアプリケーションを実行:自分、アクセスできるユーザー:全員(匿名ユーザーを含む)で公開する
//事後設定2 設定1でスクリプトを公開後に表示されるURLを控えておく
//事後設定3 Backlogの管理画面のプロジェクト設定＞インテグレーション＞Webhookの設定で、①課題登録にのみチェックを入れ、設定2のURLをWebhook先に登録する
//事後設定4 タイマーのアイコンからプロジェクトのトリガー画面で、①updateIssue、②checkIssueStatusの毎日深夜帯に実行するようトリガー追加する(例：①午前2:00-3:00、②午前3:00-4:00)


//Backlogの課題登録時にWebhookでポストされたjsonデータから転記先プロジェクトに課題を登録する関数
function doPost(e) {
  //GAS WebアプリケーションにPOSTされたJSONデータを処理できるようにする
  var jsonString = e.postData.getDataAsString();
  var data = JSON.parse(jsonString);
  
  //BacklogAPIのKeyとPOST先のURLを定義する
  var apiKey = PropertiesService.getScriptProperties().getProperty('BACKLOG_API_KEY');
  var postURL = "https://asahi-vmp.backlog.com/api/v2/issues?apiKey=" + apiKey;
  
  //スプレッドシートに付随しないスタンドアロンなスクリプトのため、事前条件5で取得したスプレッドシートのIDを読み取るようにする。
  var sp = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  var settingSheet = sp.getSheetByName("BacklogSetting");
  
  //スプレッドシートの指定セルから、課題登録数と、課題登録に必要なプロジェクトIDやタスク種別、優先度を読み込む
  var sheetData =settingSheet.getRange(2, 7, 1, 7).getValues();
  
  //スプレッドシートの指定セルから、課題登録者の対象を入力する
  var memberList =settingSheet.getRange(1, 2, sheetData[0][6]).getValues();
  
  //必要となるパラメータごとに宣言し、その中にWebhookで入手した情報を格納
  //配列の場合、うまくパラメータ取得できないケースがあるため、変数として処理
  var projectKey = data["project"]["projectKey"];
  var keyID = data["content"]["key_id"];
  var issueKey = projectKey + "-" + keyID;
  var summary = data["content"]["summary"];
  var startDate = data["content"]["startDate"];
  var dueDate = data["content"]["dueDate"];
  var issueStatus = data["content"]["status"]["id"]
  var asseginee = data["createdUser"]["id"];
  var projectId = sheetData[0][2];
  var issueTypeId = sheetData[0][3];
  var priorityId = sheetData[0][4];

  //Webhookの課題情報の中から必要なパラメータをスプレッドシートに格納
  settingSheet.getRange(4+Number(sheetData[0][0]), 7).setValue(issueKey);
  settingSheet.getRange(4+Number(sheetData[0][0]), 8).setValue(summary);
  settingSheet.getRange(4+Number(sheetData[0][0]), 9).setValue(startDate);
  settingSheet.getRange(4+Number(sheetData[0][0]), 10).setValue(dueDate);
  settingSheet.getRange(4+Number(sheetData[0][0]), 11).setValue(issueStatus);
  settingSheet.getRange(4+Number(sheetData[0][0]), 12).setValue(asseginee);
  
  
  //assegineeのIDが存在しない場合はデフォルトユーザーで登録
  if(memberList[0].indexOf(asseginee)== -1){
    //indexOfは配列に指定の値が存在しない時、戻り値が-1
    asseginee = sheetData[0][5]; 
  }
  //担当者のIDをスプレッドシートに格納
  settingSheet.getRange(4+Number(sheetData[0][0]), 13).setValue(asseginee); 
  
  //ここからは課題への登録処理を行う
  var flag =0;
  for(i=0;i<sheetData[0][6];i++){
    Logger.log(memberList[i][0]);
    if(memberList[i][0] == asseginee) flag =1;
  }
  //assegineeのIDが存在しない場合はデフォルトユーザーで登録
  if(flag == 0){
    asseginee = sheetData[0][5]; 
  } 
  //転記先の件名には転記元の課題キーを含める形にする
  summary = issueKey + " " + summary;
  
  
  //ここからBacklogAPIを利用して課題登録を行う
  //payloadの中に課題登録に必要なパラメータを入力する
  var payload =
      {
        "projectId" : sheetData[0][2],
        "issueTypeId" : sheetData[0][3] ,
        "priorityId" : sheetData[0][4],
        "summary" : summary,
        "description" : issueKey,
        "startDate" : startDate,
        "dueDate" : dueDate,
        "assigneeId" : asseginee,
      };
  //httpの通信オプションとして、前述のpayloadとmethodをpostとして格納
  var options =
      {
        "method" : "post",
        "payload" : payload
      };
  
  //事前設定したpost先のURLにデータをポストし、戻り値で得た転記先プロジェクトの課題IDを取得する
  var responseData = UrlFetchApp.fetch(postURL, options);
  responseData = JSON.parse(responseData);
  settingSheet.getRange(4+Number(sheetData[0][0]), 13).setValue(responseData["issueKey"]);  
  
}

//BacklogAPIを利用し、転記元・先課題の有無と完了のステータスをチェックする
function checkIssueStatus(){
  //BacklogAPIのKeyとPOST先のURLを定義する
  var apiKey = PropertiesService.getScriptProperties().getProperty('BACKLOG_API_KEY');
  
  //スプレッドシートに付随しないスタンドアロンなスクリプトのため、事前条件5で取得したスプレッドシートのIDを読み取るようにする。
  var sp = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  var settingSheet = sp.getSheetByName("BacklogSetting");
  //スプレッドシートの指定セルから、課題登録数と、課題登録に必要なプロジェクトIDやタスク種別、優先度を読み込む
  var issueNum = settingSheet.getRange(2, 7).getValue();
  //読み込む課題が1つもない場合は処理を終了する
  if(issueNum < 1) return 0;
  //シートから課題情報の各種情報を読み取る
  var sheetData =settingSheet.getRange(4, 7, issueNum, 7).getValues();
  var updateData = new Array();
  
  var count=0;
  for(i=0;i<issueNum;i++){
    var orgURL = "https://asahi-vmp.backlog.com/api/v2/issues/" + sheetData[i][0].toString() + "?apiKey=" +apiKey ;
    var copyURL = "https://asahi-vmp.backlog.com/api/v2/issues/" + sheetData[i][6].toString() + "?apiKey=" +apiKey ;
    
    try{
      UrlFetchApp.fetch(orgURL);
      UrlFetchApp.fetch(copyURL);
      
      if(sheetData[i][4] < 4){
        updateData[count] =[];
        for(j=0;j<7;j++){
          updateData[count][j] = sheetData[i][j];
          count;
        }
        count++;
      }
      
    }catch(e){
      
    }
  }
  
  Logger.log(count);
  Logger.log(updateData);
  
  //更新した課題情報を書き込む前に既存の課題情報を削除する
  settingSheet.getRange(4, 7, issueNum, 7).clear();
  
  //ステータスをチェックした後の課題に更新する
  settingSheet.getRange(4, 7, count, 7).setValues(updateData);
}

  

//BacklogAPIを利用して、課題のステータス更新を行う
function updateIssue(){
  
  //BacklogAPIのKeyとPOST先のURLを定義する
  var apiKey = PropertiesService.getScriptProperties().getProperty('BACKLOG_API_KEY');
  
  //スプレッドシートに付随しないスタンドアロンなスクリプトのため、事前条件5で取得したスプレッドシートのIDを読み取るようにする。
  var sp = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  var settingSheet = sp.getSheetByName("BacklogSetting");
  
  //スプレッドシートの指定セルから、課題登録数と、課題登録に必要なプロジェクトIDやタスク種別、優先度を読み込む
  var issueNum = settingSheet.getRange(2, 7).getValue();
  if(issueNum < 1) return 0;
  var sheetData =settingSheet.getRange(4, 7, issueNum, 7).getValues();

            Logger.log(sheetData[0][1]);
          Logger.log(sheetData[0][2]);
          Logger.log(sheetData[0][3]);
          Logger.log(sheetData[0][4]);
  
  for(i=0;i<issueNum;i++){
    var backlogURL = "https://asahi-vmp.backlog.com/api/v2/issues/" + sheetData[i][0].toString() + "?apiKey=" +apiKey ;
    
    //HTTPSのGETで読み込んだ課題IDの課題情報をjson形式で取得する    
    var responseData = UrlFetchApp.fetch(backlogURL);
    responseData = JSON.parse(responseData);

          Logger.log(responseData["startDate"]);
          Logger.log(responseData["dueDate"]);
    
    //取得したデータの中から件名と開始日、期限日、課題状態を取得する
    var summary = responseData["summary"];
    var issueStatus = responseData["status"]["id"];
    if(responseData["startDate"] != null){
      var startDate = responseData["startDate"].slice(0,10);
    }else{
      var startDate = "";
    }
    if(responseData["dueDate"] != null){
      var dueDate = responseData["dueDate"].slice(0,10);
    }else{
      var dueDate = "";
    }   
    
    //取得した４つのデータがシートと変化がない場合、何も処理を行わない。１つでも変化があった場合は    
    if(sheetData[i][1] == summary && sheetData[i][2] == startDate && sheetData[i][3] == dueDate && sheetData[i][4] == issueStatus){
      Logger.log("checked!");
      continue;
      
    }else{
      backlogURL = "https://asahi-vmp.backlog.com/api/v2/issues/" + sheetData[i][6].toString() + "?apiKey=" + apiKey;
      var payload =
          {
            "summary" : sheetData[i][0] + " " + summary,
            "startDate" : startDate,
            "dueDate" : dueDate,
            "statusId" : issueStatus,
          };
      //httpの通信オプションとして、前述のpayloadとmethodをpatchとして格納
      var options =
          {
            "method" : "patch",
            "payload" : payload
          };
      Logger.log(payload);

      
      //指定URLにデータをpatchし、課題のステータス変更を反映
      UrlFetchApp.fetch(backlogURL, options);
      
      //スプレッドシートに上書き
      settingSheet.getRange(4+i, 8).setValue(summary);
      settingSheet.getRange(4+i, 9).setValue(startDate);
      settingSheet.getRange(4+i, 10).setValue(dueDate);
      settingSheet.getRange(4+i, 11).setValue(issueStatus);
      
    }
    
  }
    
}