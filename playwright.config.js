import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:30000,expect:{timeout:10000},workers:1,retries:process.env.CI?1:0,
 use:{baseURL:'http://127.0.0.1:4174/spray-net-network-pwa/',trace:'retain-on-failure'},
 projects:[{name:'android',use:{...devices['Pixel 7'],browserName:'chromium'}},{name:'desktop',use:{browserName:'chromium',viewport:{width:1280,height:900}}},{name:'ipad',use:{...devices['iPad Pro 11'],browserName:'webkit'}}],
 webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4174/spray-net-network-pwa/',reuseExistingServer:!process.env.CI}
});
