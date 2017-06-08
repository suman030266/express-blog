const mongodb = require('./db');
const crypto = require('crypto');

function User(user) {
	this.name = user.name;
	this.password = user.password;
	this.email = user.email;
};

//存储用户信息
User.prototype.save = function(callback) {
	
	let md5 = crypto.createHash('md5'),
		email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
		head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
		console.log(head);
	//要存入数据库的用户信息文档
	let user = {
		name: this.name,
		password: this.password,
		email: email_MD5,
		head: head
	};
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);//错误，返回 err 信息
		}
		//读取 users 集合
		db.collection('users', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);//错误，返回 err 信息
			}
			//将用户数据插入 users 集合
			collection.insert(user, {
				safe: true
			}, function (err, user) {
				mongodb.close();
				if (err) {
					return callback(err);//错误，返回 err 信息
				}
				callback(null, user[0]);//成功！err 为 null，并返回存储后的用户文档
			});
		});
	});
};

//读取用户信息
User.get = function(name, callback) {
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);//错误，返回 err 信息
		}
		//读取 users 集合
		db.collection('users', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);//错误，返回 err 信息
			}
			//查找用户名（name键）值为 name 一个文档
			collection.findOne({
				name: name
			}, function (err, user) {
				mongodb.close();
				if (err) {
					return callback(err);//失败！返回 err 信息
				}
				callback(null, user);//成功！返回查询的用户信息 找到用户信息了 用户已经存在了
			});
		});
	});
};

module.exports = User;