# 日次コンディション・ダッシュボード

![ダッシュボードの動作デモ](./gas-viz.gif)

## アプリケーション概要

Google Apps Script (GAS) をバックエンド、HTML/CSS/Vanilla JS をフロントエンドとして構築された、日々の体調や学習ログを記録・可視化するための直感的なダッシュボードアプリケーションです。
スプレッドシートをデータベースとして活用し、以下の機能を提供します。

- **KPIとグラフの可視化**: 日次コンディションの推移、体調維持率、学習場所の割合などをグラフ化。
- **期間フィルタリング**: 直近14日 / 1ヶ月 / 3ヶ月 / 全期間 で動的にデータを絞り込み。
- **活動ログのインライン編集**: UIのテーブルセルをダブルクリックし、直接データを上書き保存可能。

## アーキテクチャ構成

- **バックエンド:** Google Apps Script (`Code.gs`)
- **フロントエンド:** HTML/CSS/Vanilla JS (`index.html`, `css.html`, `js.html`)
- **コード品質管理:** ESLint, Prettier
- **ローカル開発・テスト:** Node.js, Playwright
- **構成管理・デプロイ:** Git, `clasp`

---

## 開発環境のセットアップ

本プロジェクトではローカル環境でモダンな開発を行うために、Node.jsとGitを活用しています。

### 1. 動作要件
- Node.js (v18以降推奨)
- npm
- Git
- clasp (グローバルインストール推奨)

### 2. 初回セットアップ
リポジトリをクローンまたはローカルに展開後、依存パッケージとPlaywright（Chromiumブラウザ）をインストールします。

```bash
# パッケージのインストール
npm install

# Playwrightブラウザのインストール
npx playwright install --with-deps chromium
```

### 3. 環境変数の設定（必要時）
`.env.example`（もしあれば）をコピーして `.env` を作成し、必要な環境変数を設定してください。
※ `.env` および各自の検証用GAS環境を紐づける `.clasp.json` は、情報漏洩や環境破壊を防ぐためにGitの管理対象外（`.gitignore` 設定済み）となっています。

---

## 開発フローとコマンド

本プロジェクトではコードの品質を担保するため、Linter（ESLint）とFormatter（Prettier）を導入しています。

### コードのフォーマットと静的解析

コーディングの都度、またはコミット前には以下のコマンドで規約違反がないか確認・修正してください。

```bash
# フォーマットの自動修正（Prettier）
npm run format

# 静的解析と自動修正（ESLint）
npm run lint:fix
```

### テストの実行

GAS特有の認証の壁を回避し、ローカル環境で「静的モックビルド ＋ Playwright Injection」という高速・安定したUIテストを実行します。

```bash
npm run test
```

#### 💡 実行時の内部フロー (`package.json`)
テスト実行時、`pretest` フックにより事前に**フォーマットチェック (`format:check`)**、**Lintチェック (`lint`)**、および**モックHTMLのビルド (`build:mock`)** が自動的に走る仕様になっています。
これにより、品質基準を満たさないコードはテストの手前で弾かれる仕組みです。

エラーのトレースや画面のスクリーンショットを確認したい場合は以下のコマンドを使用します。

```bash
npx playwright show-report
```

---

## デプロイ（本番反映）

実環境（Google Apps Script）へのコード反映には `clasp` を使用します。
`.claspignore` の設定により、テストスクリプトや品質管理設定ファイル（`tests/`, `.eslintrc.js` などリポジトリ上の開発系ファイル）はアップロードされず、純粋に必要な `*.html` と `Code.gs` のみが安全かつ軽量にデプロイされます。

```bash
npx clasp push
```

---

## 今後の展望
- TypeScriptへのリファクタリング
スプレッドシートの規模が大きくなっても対応可能なように、Typescriptを導入する

