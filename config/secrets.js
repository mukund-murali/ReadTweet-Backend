// fixup to retrieve MongDb creds from Bluemix if configured 
var getBluemixDbUri = function() { 
  var dbUri = ""; 
  if (process.env.VCAP_SERVICES) { 
    var env = JSON.parse(process.env.VCAP_SERVICES); 
    var mongoVersion = 'mongolab'; 
    if (env[mongoVersion]) { 
      dbUri = env[mongoVersion][0].credentials.uri;  
    } 
  } 
  if (dbUri === "") return null; 
  else return dbUri; 
};

module.exports = {

  db: getBluemixDbUri() || process.env.MONGODB || 'mongodb://localhost:27017/test',

  sessionSecret: process.env.SESSION_SECRET || 'tempSecretKey',

  mailgun: {
    user: process.env.MAILGUN_USER || '',
    password: process.env.MAILGUN_PASSWORD || ''
  },
  
  mandrill: {
    user: process.env.MANDRILL_USER || '',
    password: process.env.MANDRILL_PASSWORD || ''
  },

  sendgrid: {
    user: process.env.SENDGRID_USER || '',
    password: process.env.SENDGRID_PASSWORD || ''
  },

  twitter: {
    consumerKey: process.env.TWITTER_KEY || 'UAa2G9orWHWg5pQYiz9watKgz',
    consumerSecret: process.env.TWITTER_SECRET  || 'XIq9dqi43eRG1zs4wBxQoLwGS5HRbLUB0ooRAwCEvV8DAJXjT0',
    callbackURL: '/auth/twitter/callback',
    passReqToCallback: true
  },
};
