import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',timeout:45_000,expect:{timeout:10_000},fullyParallel:false,workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4173/freiraum-pwa/',trace:'retain-on-failure',screenshot:'only-on-failure',serviceWorkers:'allow'},
  projects:[
    {name:'chromium-phone',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
    {name:'webkit-iphone',use:{...devices['iPhone 13'],defaultBrowserType:'webkit'}},
    {name:'webkit-ipad',use:{...devices['iPad Pro 11'],defaultBrowserType:'webkit'}},
    {name:'chromium-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
  ],
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173/freiraum-pwa/',reuseExistingServer:!process.env.CI},
});
