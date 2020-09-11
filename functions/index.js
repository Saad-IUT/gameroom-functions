const functions = require('firebase-functions')
const app = require('express')()
const FBAuth = require('./util/fbAuth')

const cors = require('cors')
app.use(cors())

const {
  login,
  signup,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
} = require('./handlers/users')
const {
  addVideo,
  getAllVideos,
  getVideo,
  deleteVideo,
  addVideoDetails,
} = require('./handlers/videos')

// Video routes
app.get('/videos', getAllVideos)
app.post('/video', FBAuth, addVideo)
app.get('/video/:videoId', getVideo)
app.delete('/video/:videoId', FBAuth, deleteVideo)
app.post('/video/details/:videoId', FBAuth, addVideoDetails)

// Users routes
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user/details', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)
app.get('/user/:handle', getUserDetails)

exports.api = functions.https.onRequest(app)
