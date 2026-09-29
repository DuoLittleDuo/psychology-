/**
 * 页面共用的渐变背景令牌。
 *
 * 三个板块共用同一套「岫烟青 → 霜纨白」渐变:
 *   - 系统总览 / 当前象限面板
 *   - 系统总览 / 协作记录面板(用 ALT 角度错开)
 *   - Agent 运作说明 / 顶部 hero 卡片
 * 集中在此定义,避免多处副本各自漂移。
 */

/**
 * 岫烟青。原色 #00B7C7 是中等明度青(亮度 0.380),整体观感偏重,
 * 故混入 30% 白降一档 -> #4DCDD8(亮度 0.477),色彩更轻、更干净。
 * 端点变浅只会抬高深色文字的对比度,不存在可读性回退。
 */
const TEAL = '#4DCDD8'

/** 霜纨白。已接近白,不再调整。 */
const FROST = '#FCF9E8'

/**
 * 主渐变:上下垂直。
 * 角度取 174° 而非 180°,避开纯垂直的机械感,过渡更弥散、无硬边界。
 * 用此背景的面板文字一律取深色 —— slate-950 全程最低仍有 10:1 以上。
 */
export const GRADIENT_BG = {
  backgroundImage: `linear-gradient(174deg, ${TEAL} 0%, ${FROST} 100%)`,
} as const

/** 次要面板用 186°,与主面板方向错开,避免同屏两块渐变完全同步 */
export const GRADIENT_BG_ALT = {
  backgroundImage: `linear-gradient(186deg, ${TEAL} 0%, ${FROST} 100%)`,
} as const

/**
 * 极淡细密颗粒噪点,叠在渐变之上增加质感。
 * 用 inline SVG feTurbulence 生成,无需外部图片;baseFrequency 取大值保证颗粒细密,
 * opacity 压到 0.05 使其仅作纹理,不干扰文字可读性。
 */
export const GRAIN_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")"
