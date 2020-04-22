# GoogleAppsScripts_BacklogAutoCopyIssueAnotherProject
  Backlog課題の自動転記ツール
　BacklogのWebhookとBacklogAPIの機能を使い、複数のBacklogプロジェクトで登録された課題を自動的に１つのプロジェクトに集約する機能です。

# 特徴 Features
　BacklogのWebhook機能を利用して、各サイトのプロジェクトに課題追加時にタスク管理のプロジェクトに自動的に課題を登録する機能です。
その他にも、定期的にスケジュール実行で転記元の課題情報を参照し、件名や開始日、締切日、状態に変更があった場合は、転記先も更新する機能もあります。

# 要件 Requirement

* BacklogのAPI発行
* Googleスプレッドシートの準備
* Google App Scriptのプロジェクトファイル作成

# 設置方法 Installation

## 事前設定内容 BeforeSetting

1. BacklogのAPIを利用できるように、Backlogのユーザー個人設定からAPIキーを発行
1. Googleスプレッドシートを新規作成、シート名を「BacklogSetting」に名前変更する。Backlogユーザー名(A列)とメンバーID(B列)の対応表入力。スプレッドシートURL欄の「~d/○○/edit#~」の○○を控えておく

## スクリプト設定作業 scriptSetting

1. Googleドライブの画面からGoogle Apps Scriptを新規追加します。
1. 新規に追加したスクリプトに「doPostBacklog.gs」の内容を貼り付けます。
1. メニュー「ファイル＞プロジェクトのプロパティ」のスクリプトプロパティタブで「プロパティ:BACKLOG_API_KEY、値：事前条件1で控えた値」を入力
1. スプレッドシートのG1~L2列までにワークスペースURLやプロジェクトID、タスク種別、優先度のデフォルトを設定します。
1. メニュー「ファイル＞プロジェクトのプロパティ」のスクリプトプロパティタブで「プロパティ:SHEET_ID、値：事前条件2で控えた値」を入力

## スクリプト設定後作業 AfterSetting

1. メニュー「公開＞ウェブアプリケーション導入」で、バージョン:New、次のユーザーとしてアプリケーションを実行:自分、アクセスできるユーザー:全員(匿名ユーザーを含む)で公開する
1.  設定1でスクリプトを公開後に表示されるURLを控えておく
1. Backlogの管理画面のプロジェクト設定＞インテグレーション＞Webhookの設定で、①課題登録にのみチェックを入れ、設定2のURLをWebhook先に登録する
2. タイマーのアイコンからプロジェクトのトリガー画面で、①updateIssue、②checkIssueStatusの毎日深夜帯に実行するようトリガー追加する(例：①午前2:00-3:00、②午前3:00-4:00)

# 利用方法 Usage
 
Webhookの設定を行ったBacklogのプロジェクトで課題の追加が行われると、処理が稼働し、自動的に設定したプロジェクトにも登録内容が反映されます。
updateIssueを定期実行することで、追加元のプロジェクトの状態や件名の変更が自動コピー先の課題にも自動反映されます。
 
# 注意点 Note
 
膨大な数のプロジェクトを1つのプロジェクトに自動転記コピーして集約させる場合、処理負荷が高まり、Webhookの処理でエラーすることがあります。
Google Apps Scriptのサービスが停止している場合やBacklogのWebhookが停止している場合には、処理は実行されません。
 
# 作者 Author
 
* Tyamamoto1007
* https://auto-worker.com/blog
* tyamamoto@try.main.jp
 
# ライセンス License
 
GoogleAppsScripts_BacklogAutoCopyIssueAnotherProject is under [MIT license](https://en.wikipedia.org/wiki/MIT_License).

このコードはMITライセンスに則り、自由に改変して利用できます。

