var path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        'js/bundle': [
            './resources/assets/js/styles.js',
            './resources/assets/js/conf/employee.js',
            './resources/assets/js/welcome.js',
            './resources/assets/js/paystubs.js',
            './resources/assets/js/employees.js',
            './resources/assets/js/upload.js',
            './resources/assets/js/custom.js',
            './resources/assets/js/dashboard.js',
            './resources/assets/js/home.js',
            './resources/assets/js/approvals.js',
            './resources/assets/js/views/invoices/edit.js',
            './resources/assets/js/views/invoices/historical.js',
            './resources/assets/js/views/invoices/search.js',
            './resources/assets/js/views/invoices/upload.js',
            './resources/assets/js/views/overrides/detail.js',
            './resources/assets/js/views/paystubs/paystubs.js',  
        ],
    },
    output: {
        path: path.resolve(__dirname, 'public/dist'),
        filename: '[name].[hash]',
    },
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/i,
                use: [
                    'style-loader', 
                    'css-loader', 
                    'resolve-url-loader',
                    'sass-loader',
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'resolve-url-loader',
                    'css-loader',
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new ExtractTextPlugin({
            filename: 'styles/[name].[hash].css',
            allChunks: true,
        }),
    ]
};