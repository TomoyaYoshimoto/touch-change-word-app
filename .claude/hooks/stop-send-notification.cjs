#!/usr/bin/env node

const { execSync } = require('child_process');

// macOSの通知を送信
try {
    execSync('osascript -e "display notification \\"Claude Codeの実行が完了しました\\" with title \\"実行完了\\" sound name \\"Glass\\""', { stdio: 'pipe' });
    console.log('通知を送信しました');
} catch (error) {
    // osascriptが利用できない場合は単純なメッセージを出力
    console.log('Claude Codeの実行が完了しました');
}