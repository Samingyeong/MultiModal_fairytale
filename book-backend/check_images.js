const { db } = require('./db')
const fs = require('fs')
const path = require('path')

const total   = db.prepare('SELECT COUNT(*) as c FROM books').get().c
const noImg   = db.prepare("SELECT COUNT(*) as c FROM books WHERE local_img IS NULL").get().c
const noThumb = db.prepare("SELECT COUNT(*) as c FROM books WHERE thumbnail IS NULL OR thumbnail = ''").get().c

console.log(`전체: ${total}`)
console.log(`local_img 없음: ${noImg}`)
console.log(`thumbnail 없음: ${noThumb}`)

// local_img는 있지만 실제 파일이 없는 경우
const withImg = db.prepare("SELECT title, local_img, thumbnail FROM books WHERE local_img IS NOT NULL").all()
let missing = 0
const missingList = []
for (const row of withImg) {
  const filePath = path.join(__dirname, 'data', row.local_img.replace('/images/', 'images/'))
  if (!fs.existsSync(filePath)) {
    missing++
    missingList.push({ title: row.title, local_img: row.local_img })
  }
}
console.log(`파일 없는 local_img: ${missing}`)
if (missingList.length > 0) {
  console.log('샘플:', missingList.slice(0, 5))
}

// local_img 없는 샘플
const noImgSamples = db.prepare("SELECT title, thumbnail FROM books WHERE local_img IS NULL LIMIT 5").all()
console.log('local_img 없는 샘플:', noImgSamples)
