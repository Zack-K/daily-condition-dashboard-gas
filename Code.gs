/**
 * 設定定数
 */
const CONFIG = {
  SPREADSHEET_ID: '1y9-B7C7Og-DmkXF3UJGsClQeHVnvR81VSlnWfaf2770',
  SHEET_NAME: 'フォーム落ち', // TODO: シート名が不明なため仮置き（後でID指定か最初のシートを取得するように修正）
  MAX_RECORDS: 300, // 期間フィルター用に直近300件（約1年分弱）を取得
};

/**
 * Webアプリのエンドポイント
 */
function doGet() {
  var template = HtmlService.createTemplateFromFile('index');
  return template
    .evaluate()
    .setTitle('日次コンディション・ダッシュボード')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // <iframe>等での埋め込み許可
}

/**
 * HTML側から外部ファイル（CSS/JS）をインクルードするためのヘルパー関数
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ダッシュボード用のデータを取得・整形して返す関数（google.script.runから呼ばれる）
 */
function getDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheets()[0]; // 最初のシート決め打ち

    // データのある範囲全体を取得
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // ヘッダー行をスキップしてデータ行を取得
    const dataRows = values.slice(1);

    // 最新100件にフィルタリング（パフォーマンス担保）
    const recentRows = dataRows.reverse().slice(0, CONFIG.MAX_RECORDS);

    // データクレンジングとJSONオブジェクト化
    const records = recentRows.map(function (row, index) {
      // rowの元のインデックスを計算 (逆順にする前、かつヘッダーを除く行番号: 行は1始まりなので+2)
      // dataRows.length - index + 1
      const originalRowIndex = dataRows.length - index + 1;

      // 各列のインデックス（シート形式に依存）
      // 0: タイムスタンプ
      // 1: 今朝の体調は？
      // 2: 朝のルーティーンはできたか？
      // 3: 本日の学習場所は？
      // 4: 本日の学習内容は？
      // 5: その他、気になることや懸念事項は？
      // 6: 朝の気力は？ (データによっては空)
      // 7: 朝の体力は？ (データによっては空)
      // 8: 今日の睡眠時間は？

      return {
        row: originalRowIndex,
        timestamp: row[0] ? new Date(row[0]).toISOString() : null,
        condition: row[1] || '',
        routine: row[2] || '',
        location: row[3] || '',
        content: row[4] || '',
        notes: row[5] || '',
        vitality: parseNumericScore(row[6]), // 気力スコア化（G列）
        stamina: parseNumericScore(row[7]), // 体力スコア化（H列）
        sleepHours: parseSleepHours(row[8]), // 睡眠時間を数値化（I列のみ）
      };
    });

    return {
      status: 'success',
      records: records,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    Logger.log('Error fetching data: ' + error.toString());
    return {
      status: 'error',
      message: error.toString(),
    };
  }
}

/**
 * 睡眠時間（例：「8h睡眠」「9時間睡眠」）から数値を抽出するクレンジング関数
 * I列(G~I列)以外に書かれている場合は無視（null）とする仕様。
 */
function parseSleepHours(sleepString) {
  if (!sleepString) return null;

  // 文字列に変換し、全角数字を半角に変換する
  let str = String(sleepString).trim();
  str = str.replace(/[０-９]/g, function (s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
  });

  // 睡眠時間専用列(I列)から最初の数値を抽出
  const match = str.match(/([0-9]+\.?[0-9]*)/);
  if (match && match[1]) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * 気力・体力を数値化する関数（現状データが空だが、将来的な数値入力に備える）
 */
function parseNumericScore(scoreString) {
  if (scoreString === '' || scoreString == null) return null;
  const num = parseFloat(scoreString);
  return isNaN(num) ? null : num;
}

/**
 * データの任意セルを更新する関数（google.script.runから呼ばれる）
 * @param {number} row 行番号（1始まり）
 * @param {string} columnKey 更新対象のフィールド名(condition, location等)
 * @param {any} value 入力された値
 */
function updateRecord(row, columnKey, value) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];

    // フィールド名と列番号(1始まり)のマッピング
    const columnMap = {
      condition: 2,
      routine: 3,
      location: 4,
      content: 5,
      notes: 6,
      vitality: 7,
      stamina: 8,
      sleepHours: 9,
    };

    const colIndex = columnMap[columnKey];
    if (!colIndex) {
      throw new Error(`Invalid column key: ${columnKey}`);
    }

    // シートの該当セルを更新
    sheet.getRange(row, colIndex).setValue(value);

    return { status: 'success', row: row, updatedKey: columnKey };
  } catch (error) {
    Logger.log('Error updating record: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}
