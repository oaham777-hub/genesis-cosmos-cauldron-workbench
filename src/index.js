/**
 * 宿主侧入口：只读快照服务。
 *
 * P0 阶段不接任何写操作；后续接 zhaohua export 的 JSON 输出，
 * 由客户端订阅后渲染工作台页面。
 */
export function apply(ctx) {
  const log = (message) => {
    try {
      ctx?.logger?.info?.(`[cauldron-workbench] ${message}`);
    } catch {
      // 宿主未提供 logger 时静默，不影响启动
    }
  };

  log('只读工作台已挂载（P0：静态页 + 快照读取）');
}
