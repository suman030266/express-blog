const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const routes = require('./routes');
const { db, host, port, cookieSecret } = require('./settings');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const multer  = require('multer');

//创建一个express实例
let app = express();

app.use(session({
	secret: cookieSecret,
	key: db,//cookie name
	cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
	store: new MongoStore({
		db,
		host,
		port
	})
}));

//增加文件上传功能
app.use(multer({
	dest: './public/uploads',
	rename: function (fieldname, filename) {
		return filename;
	}
}));

//设置模板路径以及用什么方式解析模板
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');

//flash闪存
app.use(flash());

//favicon
app.use(favicon(__dirname + '/public/favicon.ico'));

//app use 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//路由控制
routes(app);

//404
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

//打印错误
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
		res.render('error', {
			message: err.message,
            error: err
		});
    });
}

//500错误处理
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: ''
    });
});

//监听8999端口
app.listen(8999, ()=>{
	console.log('8999 is listened');
});

exports.app = app;