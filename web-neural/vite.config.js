import { defineConfig } from 'vite';

// 看板由插件自带的本机静态服务托管，资产用相对路径即可（真 origin，无鉴权前缀）。
export default defineConfig({ base: './' });
