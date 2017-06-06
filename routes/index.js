const crypto = require('crypto');
const User = require('../models/user.js');
const Post = require('../models/post.js');
module.exports = function (app){
	// index
	app.get('/', function(req, res){
		Post.getAll(null, function (err, posts) {
			let data = {
				title: '主页',
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			};
			if (err) {
			  posts = [];
			}
			data.posts = err ? [] : posts;
			res.render('index', data);
		});
	});
	// login get
	app.get('/user/login', checkNotLogin, function (req, res){
		let data = {
			title: '登录页',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		};
		res.render('login', data);
	});
	// login post
	app.post('/user/login', checkNotLogin, function (req, res){
		//生成密码的 md5 值
		let md5 = crypto.createHash('md5'),
		password = md5.update(req.body.password).digest('hex');
		//检查用户是否存在
		User.get(req.body.name, function (err, user) {
			if (!user) {
				req.flash('error', '用户不存在!'); 
				return res.redirect('back');//用户不存在则跳转到登录页
			}
			//检查密码是否一致
			if (user.password !== password) {
				req.flash('error', '密码错误!'); 
				return res.redirect('back');//密码错误则跳转到登录页
			}
			//用户名密码都匹配后，将用户信息存入 session
			req.session.user = user;
			req.flash('success', '登陆成功!');
			res.redirect('/');//登陆成功后跳转到主页
		});
	});
	// reg get
	app.get('/user/reg', checkNotLogin, function (req, res){
		let data = {
			title: '注册',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		};
		res.render('reg', data);
	});
	// reg post
	app.post('/user/reg', checkNotLogin, function (req, res){
		var name = req.body.name,
			password = req.body.password,
			password_re = req.body['password-repeat'];
		//检验用户两次输入的密码是否一致
		if (password_re != password) {
			req.flash('error', '两次输入的密码不一致!'); 
			return res.redirect('back');//返回注册页
		}
		//生成密码的 md5 值
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		let newUser = new User({
			name,
			password,
			email: req.body.email
		});
		//检查用户名是否已经存在 
		User.get(newUser.name, function (err, user) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			if (user) {
				req.flash('error', '用户已存在!');
				return res.redirect('back');//返回注册页
			}
			//如果不存在则新增用户
			newUser.save(function (err, user) {
				if (err) {
					req.flash('error', err);
					return res.redirect('back');//注册失败返回主册页
				}
				//req.session.user = user;//用户信息存入 session
				req.flash('success', '注册成功!');
				res.redirect('/user/login');//注册成功后返回主页
			});
		});
	});
	// logout
	app.get('/user/logout', checkLogin, function (req, res){
		req.session.user = null;
		req.flash('success', '退出成功!');
		res.redirect('/');//退出成功后跳转到主页
	});
	// add article get
	app.get('/article/post', checkLogin, function (req, res) {
		let data = {
			title: 'post',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		};
		res.render('article-add', data);
	});
	// add article post
	app.post('/article/post', checkLogin, function (req, res) {
		var currentUser = req.session.user,
		post = new Post(currentUser.name, req.body.title, req.body.post);
		post.save(function (err) {
			if (err) {
			  req.flash('error', err); 
			  return res.redirect('/');
			}
			req.flash('success', '发布成功!');
			res.redirect('/');//发表成功跳转到主页
		});
	});
	//upload get
	app.get('/upload', checkLogin, function (req, res) {
		let data = {
			title: '文件上传',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		};
		res.render('upload', data);
	});
	//upload post
	app.post('/upload', checkLogin, function (req, res) {
		req.flash('success', '文件上传成功!');
		res.redirect('/upload');
	});
	//获取某人的所有文章
	app.get('/u/:name', function (req, res) {
		//检查用户是否存在
		User.get(req.params.name, function (err, user) {
			if (!user) {
				req.flash('error', '用户不存在!'); 
				return res.redirect('/');//用户不存在则跳转到主页
			}
			//查询并返回该用户的所有文章
			Post.getAll(user.name, function (err, posts) {
				if (err) {
					req.flash('error', err); 
					return res.redirect('/');
				}
				res.render('user', {
					title: user.name,
					posts: posts,
					user : req.session.user,
					success : req.flash('success').toString(),
					error : req.flash('error').toString()
				});
			});
		}); 
	});
	//获取某人某天某个标题的文章
	app.get('/u/:name/:day/:title', function (req, res) {
		Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
			if (err) {
				req.flash('error', err); 
				return res.redirect('/');
			}
			res.render('article', {
				title: req.params.title,
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
	//较验是否登录
	function checkLogin(req, res, next) {
		if (!req.session.user) {
			req.flash('error', '未登录!'); 
			res.redirect('/user/login');
		}
		next();
	}
	
	//较验是否未登录
	function checkNotLogin(req, res, next) {
		if (req.session.user) {
			req.flash('error', '已登录!'); 
			res.redirect('back');
		}
		next();
	}
};