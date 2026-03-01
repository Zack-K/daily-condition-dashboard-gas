/* eslint-env browser */
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('GAS Dashboard E2E Tests (Static Build + Injection)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. ページ読み込みの極初期にダミーのAPIエンドポイントをWindowオブジェクトへ注入する
    // ※ js.html の ApiService.getDashboardData は、"window.__mockApi" があればそれを叩く設計
    await page.addInitScript(() => {
      window.__mockApi = {
        getDashboardData: (onSuccess) => {
          console.log('[Playwright INJECTED MOCK] getDashboardData');
          setTimeout(() => {
            onSuccess({
              status: 'success',
              lastUpdated: new Date().toISOString(),
              records: [
                {
                  row: 2,
                  timestamp: new Date().toISOString(), // 今日
                  condition: '好調',
                  routine: '散歩',
                  location: '在宅',
                  content: 'Injectionテスト',
                  notes: '',
                  vitality: 5,
                  stamina: 4,
                  sleepHours: 8.0,
                },
                {
                  row: 3,
                  timestamp: new Date(
                    Date.now() - 1000 * 60 * 60 * 24 * 3
                  ).toISOString(), // 3日前
                  condition: '普通',
                  routine: 'コード',
                  location: '事業所',
                  content: '実装',
                  notes: '普通',
                  vitality: 3,
                  stamina: 3,
                  sleepHours: 6.5,
                },
                {
                  row: 4,
                  timestamp: new Date(
                    Date.now() - 1000 * 60 * 60 * 24 * 20
                  ).toISOString(), // 20日前（期間外）
                  condition: '不調',
                  routine: 'なし',
                  location: '在宅',
                  content: '休養',
                  notes: '頭痛',
                  vitality: 2,
                  stamina: 2,
                  sleepHours: 10.0,
                },
              ],
            });
          }, 50); // アニメーション等のためわずかに遅延
        },
        updateRecord: (rowId, colKey, newValue, onSuccess) => {
          console.log(
            `[Playwright INJECTED MOCK] updateRecord: row=${rowId}, key=${colKey}, val=${newValue}`
          );
          setTimeout(() => {
            onSuccess({ status: 'success', row: rowId, updatedKey: colKey });
          }, 50);
        },
      };
    });

    // 2. http-server は不要。スクリプトがビルドしたプレーンなHTMLを絶対パス（fileプロトコル）で直接開く
    const targetHtmlPath = `file://${path.resolve(__dirname, 'mock-built.html')}`;
    await page.goto(targetHtmlPath);
  });

  test('1. 初期表示：ローディング完了後にモックデータが描画されること', async ({
    page,
  }) => {
    // ローディングが完了し、メインコンテンツが表示されるのを待機
    await expect(page.locator('#loading')).toHaveClass(/hidden/, {
      timeout: 3000,
    });
    await expect(page.locator('#main-content')).not.toHaveClass(/hidden/);

    // デフォルトで「直近14日間」のフィルターがアクティブであることを確認
    const activeFilterBtn = page.locator('.filter-btn.active');
    await expect(activeFilterBtn).toContainText('14日間');

    // KPIカードの描画確認（ダミーデータのうち2件が14日以内で描画される）
    // 2件とも condition="好調" か "普通" のため、普通以上維持率は100%になる想定
    const kpiCondition = page.locator('#kpi-condition');
    await expect(kpiCondition).not.toHaveText('--%');
    await expect(kpiCondition).toHaveText('100.0%');

    // 睡眠時間の平均（8.0 と 6.5 の平均 = 7.25 時間 -> 四捨五入で 7.3 または 7.2）
    // toFixed(1)の挙動により環境によっては7.3になるため、修正
    const kpiSleep = page.locator('#kpi-sleep');
    await expect(kpiSleep).toHaveText('7.3 時間');
  });

  test('2. タブ切り替え：活動ログタブ遷移とデータ表示の連動確認', async ({
    page,
  }) => {
    // ロードを待つ
    await expect(page.locator('#loading')).toHaveClass(/hidden/, {
      timeout: 3000,
    });

    // 「活動ログ」タブをクリック
    const logTabBtn = page.locator('.tab-btn[data-target="tab-logs"]');
    await logTabBtn.click();

    // パネルの表示確認
    await expect(page.locator('#tab-logs')).not.toHaveClass(/hidden/);

    // テーブルにデータ行が2件（14日フィルタ内）あることを確認
    const rows = page.locator('#log-table-body tr');
    await expect(rows).toHaveCount(2);

    // 各行の内容がモックデータ通りか先頭行で確認
    const firstRowLocation = rows.nth(0).locator('td[data-key="location"]');
    await expect(firstRowLocation).toHaveText('在宅');
  });

  test('3. インライン編集：モックAPIの呼び出しとトースト通知の確認', async ({
    page,
  }) => {
    await expect(page.locator('#loading')).toHaveClass(/hidden/, {
      timeout: 3000,
    });

    // タブ切り替え
    await page.locator('.tab-btn[data-target="tab-logs"]').click();

    // 最初の行の「睡眠時間（sleepHours）」セルを編集状態へ（ダミー初期値 8.0）
    const cell = page
      .locator('#log-table-body tr')
      .first()
      .locator('td[data-key="sleepHours"]');
    await cell.dblclick();

    const input = cell.locator('input.edit-input');
    await expect(input).toBeVisible();

    // ダミー値を入力（Enterは押さず保存ボタンをクリックするアサートとする）
    await input.fill('9.5');

    // 保存ボタンを押下
    const saveBtn = page
      .locator('#log-table-body tr')
      .first()
      .locator('.save-btn');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    // トースト通知（更新完了）が表示されることを確認
    // 初期ロード時の「データ取得」トーストと重なるため hasText で絞り込む
    const toast = page
      .locator('.toast.success', { hasText: '更新完了' })
      .first();
    await toast.waitFor({ state: 'visible', timeout: 5000 });

    // 編集モードが終了し、DOMのセル値が更新されていることを確認
    await expect(cell.locator('input')).toHaveCount(0, { timeout: 5000 });
    await expect(cell).toHaveText('9.5');
    await expect(cell).toHaveText('9.5');
  });
});
