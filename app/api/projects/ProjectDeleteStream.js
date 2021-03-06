const winston = require( '../../../config/logger' )

const Project = require( '../../../models/Project' )
const DataStream = require( '../../../models/DataStream' )
const PermissionCheck = require( '../middleware/PermissionCheck' )

module.exports = async ( req, res ) => {
  if ( !req.params.projectId || !req.params.streamId )
    return res.status( 400 ).send( { success: false, message: 'No projectId or streamId provided.' } )

  try {
    let project = await PermissionCheck( req.user, 'write', await Project.findOne( { _id: req.params.projectId } ) )
    let stream = await PermissionCheck( req.user, 'write', await DataStream.findOne( { streamId: req.params.streamId }, 'canRead canWrite name streamId owner' ) )

    if ( !project || !stream )
      return res.status( 400 ).send( { success: false, message: 'Could not find project or stream.' } )

    project.streams.indexOf( stream.streamId ) === -1 ? null : project.streams.splice( project.streams.indexOf( stream.streamId ), 1 )

    let otherProjects = await Project.find( { 'streams': stream.streamId, _id: { $ne: project._id } } )

    let otherCW = Array.prototype.concat( ...otherProjects.map( p => p.permissions.canWrite ) )
    let otherCR = Array.prototype.concat( ...otherProjects.map( p => p.permissions.canRead ) )

    project.permissions.canRead.forEach( id => {
      let index = stream.canRead.indexOf( id )
      if ( otherCR.indexOf( id ) === -1 && index > -1 ) {
        stream.canRead.splice( index, 1 )
      }
    } )

    project.permissions.canWrite.forEach( id => {
      let index = stream.canWrite.indexOf( id )
      if ( otherCW.indexOf( id ) === -1 && index > -1 ) {
        stream.canWrite.splice( index, 1 )
      }
    } )
    await Promise.all( [ stream.save( ), project.save( ) ] )

    return res.send( { success: true, project: project, stream: stream } )
  } catch ( err ) {
    winston.error( JSON.stringify( err ) )
    res.status( err.message.indexOf( 'authorised' ) >= 0 ? 401 : 404 ).send( { success: false, message: err.message } )
  }
}
