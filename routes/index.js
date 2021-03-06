const crypto = require('crypto');
const User = require('../models/user.js');
const Post = require('../models/post.js');
const Comment = require('../models/comment.js');

module.exports = function (app){
	// index
	let items = 10;
	app.get('*', function (req, res, next){
		console.log('请求了'+ req.url +'页面');
		next();
	});
	app.get('/', function(req, res){
		//判断是否是第一页，并把请求的页数转换成 number 类型
		var page = req.query.p ? parseInt(req.query.p) : 1;
		//查询并返回第 page 页的 items 10 篇文章
		Post.getOnePage(null, page, function (err, posts, total) {
			if (err) {
				posts = [];
			} 
			res.render('index', {
				title: '主页',
				posts,
				page,
				totalItems: total,
				totalPage: Math.ceil(total/items),
				isFirstPage: (page - 1) == 0,
				isLastPage: ((page - 1) * items + posts.length) == total,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
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
		tags = [req.body.tag1, req.body.tag2, req.body.tag3],
		post = new Post(currentUser.name, currentUser.head, req.body.title, req.body.post, tags );
		console.log(req.body.tag1, req.body.tag2, req.body.tag3);
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
	//友情链接
	app.get('/links', function (req, res) {
		res.render('links', {
			title: '友情链接',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});
	
	//search get
	app.get('/search', function (req, res) {
		Post.search(req.query.keyword, function (err, posts) {
			if (err) {
				req.flash('error', err); 
				return res.redirect('/');
			}
			res.render('search', {
				title: "SEARCH:" + req.query.keyword,
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
	
	//获取某人的所有文章
	app.get('/u/:name', function (req, res) {
		var page = req.query.p ? parseInt(req.query.p) : 1;
		//检查用户是否存在
		User.get(req.params.name, function (err, user) {
			if (!user) {
				req.flash('error', '用户不存在!'); 
				return res.redirect('/');
			}
			//查询并返回该用户第 page 页的 10 篇文章
			Post.getOnePage(user.name, page, function (err, posts, total) {
				if (err) {
					req.flash('error', err); 
					return res.redirect('/');
				}
				let data = {
					title: user.name,
					posts,
					page,
					totalItems: total,
					totalPage: Math.ceil(total/items),
					isFirstPage: (page - 1) == 0,
					isLastPage: ((page - 1) * 10 + posts.length) == total,
					user: req.session.user,
					success: req.flash('success').toString(),
					error: req.flash('error').toString()
				};
				res.render('user', data);
			});
		}); 
	});
	//增加存档
	app.get('/archive', function (req, res) {
		Post.getArchive(function (err, posts) {
			if (err) {
				req.flash('error', err); 
				return res.redirect('/');
			}
			res.render('archive', {
				title: '存档',
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
	//增加标签
	app.get('/tags', function (req, res) {
		Post.getTags(function (err, posts) {
			console.log(JSON.stringify(posts));
			if (err) {
				req.flash('error', err); 
				return res.redirect('/');
			}
			res.render('tags', {
				title: '标签',
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
	//特定标签的所有文章
	app.get('/tags/:tag', function (req, res) {
		Post.getTag(req.params.tag, function (err, posts) {
			if (err) {
				req.flash('error',err);
				return res.redirect('/');
			}
			res.render('tag', {
				title: 'TAG:' + req.params.tag,
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
	//获取某人某天某个标题的文章
	app.get('/u/:name/:day/:title', function (req, res) {
		Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
			if (err) {
				req.flash('error', err); 
				res.redirect('/');
			}else{
				if (post) {
					let data = {
						title: req.params.title,
						post: post,
						user: req.session.user,
						success: req.flash('success').toString(),
						error: req.flash('error').Error
					};
					res.render('article', data);
				}
			}
		});
	});
	//编辑某一篇文章 get
	app.get('/edit/:name/:day/:title', checkLogin, function (req, res) {
		var currentUser = req.session.user;
		Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
			if (err) {
				req.flash('error', err); 
				return res.redirect('back');
			}
			if (!post) {
				req.flash('error', '没找到文章'); 
				return res.redirect('/u/' + currentUser.name);
			}
			let data = {
				title: '编辑',
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			};
			res.render('edit', data);
		});
	});
	//编辑某一篇文章 post
	app.post('/edit/:name/:day/:title', checkLogin, function (req, res) {
		let currentUser = req.session.user;
		Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
			let url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
			if (err) {
				req.flash('error', err); 
				return res.redirect(url);//出错！返回文章页
			}
			req.flash('success', '修改成功!');
			res.redirect(url);//成功！返回文章页
		});
	});
	//删除文章 get
	app.get('/remove/:name/:day/:title', checkLogin, function (req, res) {
		var currentUser = req.session.user;
		Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
			if (err) {
				req.flash('error', err); 
				return res.redirect('back');
			}
			req.flash('success', '删除成功!');
			res.redirect('/u/' + currentUser.name);
		});
	});
	//给文章加评论 get
	app.post('/u/:name/:day/:title', function (req, res) {
		let date = new Date(),
			time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
				 date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
		let md5 = crypto.createHash('md5'),
			email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
			head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48"; 
		let comment = {
			name: req.body.name,
			head: head,
			email: req.body.email,
			website: req.body.website,
			time: time,
			content: req.body.content
		};
		let newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
		newComment.save(function (err) {
			if (err) {
				console.log(JSON.stringify(err),'评论这里的问题');
				req.flash('error', err); 
				return res.redirect('back');
			}
			req.flash('success', '留言成功!');
			res.redirect('back');
		});
	});
	
	
	//404
	app.use(function (req, res) {
		res.render("404");
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