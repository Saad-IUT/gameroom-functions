const { admin, db } = require('../util/admin')

const config = require('../util/config')
const { validateVideoDetails } = require('../util/validators')

// Upload video
exports.addVideo = (req, res) => {
  const noVid = 'no-vid.png'

  const videoUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${req.body.videoFileName}?alt=media`

  const newVideo = {
    videoUrl,
    title:'Gameroom Sample Video Title',
    userHandle: req.user.handle,
    avatar: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    thumbnail: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noVid}?alt=media`,
  }
  db.doc(`/videos/${req.body.videoFileName}`)
    .set(newVideo)
    .then(() => {
      return res.json({ message: 'video uploaded successfully' })
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error: 'something went wrong' })
    })
}

// Get all videos
exports.getAllVideos = (req, res) => {
  db.collection('videos')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let videos = []
      data.forEach(doc => {
        videos.push({
          videoId: doc.id,
          videoUrl: doc.data().videoUrl,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          avatar: doc.data().avatar,
          thumbnail: doc.data().thumbnail,
          title: doc.data().title,
        })
      })
      return res.json(videos)
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: err.code })
    })
}

// Fetch one video
exports.getVideo = (req, res) => {
  let videoData = {}
  db.doc(`/videos/${req.params.videoId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Video not found' })
      }
      videoData = doc.data()
      videoData.videoId = doc.id
      return res.json(videoData)
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: err.code })
    })
}

// Delete a scream
exports.deleteVideo = (req, res) => {
  const document = db.doc(`/videos/${req.params.videoId}`)
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Video not found' })
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unauthorized' })
      } else {
        return document.delete()
      }
    })
    .then(() => {
      res.json({ message: 'Video deleted successfully' })
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error: err.code })
    })
}

// Add video details
exports.addVideoDetails = (req, res) => {
  const details = {
    description: req.body.description,
  }
  const { valid, errors } = validateVideoDetails(details)

  if (!valid) return res.status(400).json(errors)

  db.doc(`/videos/${req.params.videoId}`)
    .update(details)
    .then(() => {
      return res.json({ message: 'Details added successfully' })
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error: err.code })
    })
}
