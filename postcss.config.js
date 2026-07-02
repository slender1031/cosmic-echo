// postcss.config.js
// 用文件路径引用自定义插件（Next.js 支持字符串格式的插件路径）
module.exports = {
  plugins: [
    '@tailwindcss/postcss',
    './postcss-oklch-fix.js',
  ],
};
