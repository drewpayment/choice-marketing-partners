var path = require('path');

module.exports = {
    module: {
        loaders: [{
            test: /\.vue$/,
            loader: 'vue-loader'
        },{
            test: /\.js$/,
            loader: 'babel-loader'
        },{
            test: /\.html$/,
            loader: 'html-loader'
        },{
            test: /\.scss$/,
            loader: 'style-loader!css-loader!autoprefixer-loader!sass-loader'
        }]
    }
};