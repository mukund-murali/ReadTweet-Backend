/**
 * IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT
 *
 * You should never commit this file to a public repository on GitHub!
 * All public code on GitHub can be searched, that means anyone can see your
 * uploaded secrets.js file.
 *
 * I did it for your convenience using "throw away" API keys and passwords so
 * that all features could work out of the box.
 *
 * Use config vars (environment variables) below for production API keys
 * and passwords. Each PaaS (e.g. Heroku, Nodejitsu, OpenShift, Azure) has a way
 * for you to set it up from the dashboard.
 *
 * Another added benefit of this approach is that you can use two different
 * sets of keys for local development and production mode without making any
 * changes to the code.

 * IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT
 */

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

  sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',

  mailgun: {
    user: process.env.MAILGUN_USER || 'postmaster@sandbox697fcddc09814c6b83718b9fd5d4e5dc.mailgun.org',
    password: process.env.MAILGUN_PASSWORD || '29eldds1uri6'
  },
  
  mandrill: {
    user: process.env.MANDRILL_USER || 'hackathonstarterdemo',
    password: process.env.MANDRILL_PASSWORD || 'E1K950_ydLR4mHw12a0ldA'
  },

  sendgrid: {
    user: process.env.SENDGRID_USER || 'hslogin',
    password: process.env.SENDGRID_PASSWORD || 'hspassword00'
  },

  twitter: {
    consumerKey: process.env.TWITTER_KEY || 'UAa2G9orWHWg5pQYiz9watKgz',
    consumerSecret: process.env.TWITTER_SECRET  || 'XIq9dqi43eRG1zs4wBxQoLwGS5HRbLUB0ooRAwCEvV8DAJXjT0',
    callbackURL: '/auth/twitter/callback',
    passReqToCallback: true
  },
};
