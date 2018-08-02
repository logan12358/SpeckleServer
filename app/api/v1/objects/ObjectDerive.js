const winston = require( 'winston' )
const { assign, omit } = require( 'lodash' )
const assert = require( 'assert' )

const SpeckleObject = require( '../../../../models/SpeckleObject' )
const BulkObjectSave = require( '../middleware/BulkObjectSave' )
const PermissionCheck = require( '../middleware/PermissionCheck' )

module.exports = ( req, res ) => {
  if ( !req.body ) {
    res.status( 400 )
    return res.send( { success: false, message: 'Malformed request.' } )
  }

  SpeckleObject.findOne( { _id: req.params.objectId } )
    .then( result => PermissionCheck( req.user, 'read', result ) )
    .then( result => result.toObject() )
    .then( result => omit( result, [ 'hash', '_id' ] ) )
    //.then( result => { console.log( result ); return result; } )
    .then( result => { assign( result, req.body ); return result; } )
    .then( result => BulkObjectSave( [ result ], req.user ) )
    .then( objects => { assert( objects.length === 1 ); return objects[0]; } )
    .then( object => res.send( {
      success: true,
      message: 'Saved object to database.',
      resource: { type: 'Placeholder', _id: object._id }
    } ) )
    .catch( err => {
      winston.error( err )
      res.status( 400 )
      res.send( { success: false, message: err.toString() } )
    } )
}
