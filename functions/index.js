const functions = require('firebase-functions')
const app = require('express')()
const FBAuth = require('./util/fbAuth')

const cors = require('cors')
app.use(cors())

const {
  addVideo,
  getAllVideos,
  getVideoDetails,
  deleteVideo,
  editVideoDetails,
  uploadThumbnail,
  likeVideo,
  unlikeVideo,
} = require('./handlers/videos')

const {
  login,
  signup,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  getAllUsers,
} = require('./handlers/users')

// Video routes
app.get('/videos', getAllVideos)
app.post('/video', FBAuth, addVideo)
app.get('/video/:videoId', getVideoDetails)
app.delete('/video/:videoId', FBAuth, deleteVideo)
app.get('/video/:videoId/like', FBAuth, likeVideo)
app.get('/video/:videoId/unlike', FBAuth, unlikeVideo)
app.post('/video/details/:videoId', FBAuth, editVideoDetails)
app.post('/thumbnail/:videoId', FBAuth, uploadThumbnail)

// Users routes
app.get('/users', getAllUsers)
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user/details', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)
app.get('/user/:handle', getUserDetails)

exports.api = functions.https.onRequest(app)
