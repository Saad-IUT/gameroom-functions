const { admin, db } = require('../util/admin')

const config = require('../util/config')
const { validateVideoDetails } = require('../util/validators')

// Upload video
exports.addVideo = (req, res) => {
  const noVid = 'no-vid.png'

  const videoUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${req.body.videoFileName}?alt=media`

  const newVideo = {
    videoUrl,
    title: 'Gameroom Sample Video Title',
    description:
      'This is a sample short description for GAMEROOM video, please update the description as per your requirement',
    userHandle: req.user.handle,
    avatar: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
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
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
        })
      })
      return res.json(videos)
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: err.code })
    })
}

// Add thumbnail
exports.uploadThumbnail = (req, res) => {
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')

  const busboy = new BusBoy({ headers: req.headers })

  let imageToBeUploaded = {}
  let imageFileName

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Wrong file type submitted' })
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split('.')[filename.split('.').length - 1]
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * Date.now()
    ).toString()}.${imageExtension}`
    const filepath = path.join(os.tmpdir(), imageFileName)
    imageToBeUploaded = { filepath, mimetype }
    file.pipe(fs.createWriteStream(filepath))
  })
  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        // Append token to url
        const thumbnail = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
        return db.doc(`/videos/${req.params.videoId}`).update({ thumbnail })
      })
      .then(() => {
        return res.json({ message: 'Thumbnail uploaded successfully' })
      })
      .catch(err => {
        console.error(err)
        return res.status(500).json({ error: 'something went wrong' })
      })
  })
  busboy.end(req.rawBody)
}

// Fetch one video
exports.getVideoDetails = (req, res) => {
  let videoData = {}
  db.doc(`/videos/${req.params.videoId}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        videoData = doc.data()
        return db
          .collection('users')
          .where('handle', '==', doc.data().userHandle)
          .limit(1)
          .get()
      } else {
        return res.status(404).json({ error: 'Video not found' })
      }
    })
    .then(data => {
      videoData.user = {
        email: data.docs[0].data().email,
        userId: data.docs[0].id,
        imageUrl: data.docs[0].data().imageUrl,
        createdAt: data.docs[0].data().createdAt,
        website: data.docs[0].data().website,
        handle: data.docs[0].data().handle,
        location: data.docs[0].data().location,
        bio: data.docs[0].data().bio,
      }
      return res.json(videoData)
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: err.code })
    })
}

// Delete a video
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
exports.editVideoDetails = (req, res) => {
  const details = {
    description: req.body.description,
    title: req.body.title,
  }
  const { valid, errors } = validateVideoDetails(details)

  if (!valid) return res.status(400).json(errors)

  db.doc(`/videos/${req.params.videoId}`)
    .update(details)
    .then(() => {
      return res.json({ message: 'Details updated successfully' })
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error: err.code })
    })
}

// Comment on video
exports.commentOnVideo = (req, res) => {
  if (req.body.body.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' })

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    videoId: req.params.videoId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  }

  db.doc(`/videos/${req.params.videoId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Video not found' })
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 })
    })
    .then(() => {
      return db.collection('comments').add(newComment)
    })
    .then(() => {
      res.json(newComment)
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: 'Something went wrong' })
    })
}

// Like a video
exports.likeVideo = (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('videoId', '==', req.params.videoId)
    .limit(1)

  const videoDocument = db.doc(`/videos/${req.params.videoId}`)

  let videoData

  videoDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        videoData = doc.data()
        videoData.videoId = doc.id
        return likeDocument.get()
      } else {
        return res.status(404).json({ error: 'Video not found' })
      }
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            videoId: req.params.videoId,
            userHandle: req.user.handle,
          })
          .then(() => {
            videoData.likeCount++
            return videoDocument.update({ likeCount: videoData.likeCount })
          })
          .then(() => {
            return res.json(videoData)
          })
      } else {
        return res.status(400).json({ error: 'Video already liked' })
      }
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: err.code })
    })
}

// Unlike a video
exports.unlikeVideo = (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('videoId', '==', req.params.videoId)
    .limit(1)

  const videoDocument = db.doc(`/videos/${req.params.videoId}`)

  let videoData

  videoDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        videoData = doc.data()
        videoData.videoId = doc.id
        return likeDocument.get()
      } else {
        return res.status(404).json({ error: 'Video not found' })
      }
    })
    .then(data => {
      if (data.empty) {
        return res.status(400).json({ error: 'Video not liked' })
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            videoData.likeCount--
            return videoDocument.update({ likeCount: videoData.likeCount })
          })
          .then(() => {
            res.json(videoData)
          })
      }
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: err.code })
    })
}
