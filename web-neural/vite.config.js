import {defineConfig} from 'vite';

// base 固定为插件宿主的静态前缀：产物里的相对引用才能落到 /fed/neural/ 下。
export default defineConfig({ base: '/api/cauldron-workbench/fed/neural/' });
