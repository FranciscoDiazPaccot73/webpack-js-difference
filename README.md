# Webpack JS Difference

**This is a scaffolding project made for educative reasons**

You could extend the cli if you want.

## USAGE

This cli uses the webpack stats file generated with [webpack-stats-file](https://www.npmjs.com/package/webpack-stats-plugin)

1. Install **weboack-stats-plugin**
`npm i webpack-stats-plugin`

2. Initialize plugin within webpack in you main branch and run `npm run build` or `yarn build`

```
// webpack.config.js

const StatsWriterPlugin = require('webpack-stats-plugin');

module.exports = {
  // Otras configuraciones de Webpack...

  plugins: [
    new StatsWriterPlugin({
      filename: '../webpack-stats-base.json',
      stats: {
        assets: true,
      }
    })
  ]
};
```
or
```
// next.config.js
const { StatsWriterPlugin } = require('webpack-stats-plugin')

const nextConfig = {
  webpack: (config, _options) => {
    config.plugins.push(
      new StatsWriterPlugin({
        filename: '../webpack-stats-base.json',
        stats: {
          assets: true,
        }
      })
    );

    return config;
  }
};

module.exports = nextConfig;
```

3. Move to your working branch and change the filename to `'../.tmp/webpack-stats.json'`
```
// webpack.config.js

const StatsWriterPlugin = require('webpack-stats-plugin');

module.exports = {
  // Otras configuraciones de Webpack...

  plugins: [
    new StatsWriterPlugin({
      filename: '../.tmp/webpack-stats.json',
      stats: {
        assets: true,
      }
    })
  ]
};
```
or
```
// next.config.js
const { StatsWriterPlugin } = require('webpack-stats-plugin')

const nextConfig = {
  webpack: (config, _options) => {
    config.plugins.push(
      new StatsWriterPlugin({
        filename: '../.tmp/webpack-stats.json',
        stats: {
          assets: true,
        }
      })
    );

    return config;
  }
};

module.exports = nextConfig;
```

4. Run the cli using `npx`
```
npx @fdiazpaccot/webpack-js-difference -c
```
