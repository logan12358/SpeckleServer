const winston = require( '../../../config/logger' )
const jwt = require( 'jsonwebtoken' )

const User = require( '../../../models/User' )

module.exports = function( req, res ) {
  winston.debug( 'register new user route' )
  if ( !req.body.email ) { res.status( 400 ); return res.send( { success: false, message: 'Do not fuck with us. Give us your email.' } ) }
  if ( !req.body.password ) { res.status( 400 ); return res.send( { success: false, message: 'Passwords are a necessary evil, fam.' } ) }

  let myUser = new User( {
    email: req.body.email,
    password: req.body.password,
    company: req.body.company,
    name: req.body.name ? req.body.name : 'Anonymous',
    surname: req.body.surname ? req.body.surname : '',
    apitoken: null
  } )

  let sessionSecret = process.env.SESSION_SECRET
  let userCount = 1 // do not default to 0

  User.count( {} )
    .then( count => {
      userCount = count
      return User.findOne( { 'email': req.body.email } )
    } )
    .then( user => {
      if ( user ) throw new Error( 'Email taken. Please login. Thanks!' )
      myUser.apitoken = 'JWT ' + jwt.sign( { _id: myUser._id }, sessionSecret, { expiresIn: '2y' } )
      if ( userCount === 0 )
        myUser.role = 'admin'
      return myUser.save( )
    } )
    .then( savedUser => {
      let token = 'JWT ' + jwt.sign( { _id: myUser._id, name: myUser.name }, sessionSecret, { expiresIn: '24h' } )
      return res.send( { success: true, message: 'User saved. Redirect to login.', resource: { apitoken: savedUser.apitoken, token: token, email: savedUser.email } } )
    } )
    .catch( err => {
      winston.error( err )
      res.status( 400 )
      return res.send( { success: false, message: err.message } )
    } )
}
