const { db } = require('./db')
const book = db.prepare(`SELECT title, description FROM books WHERE length(description) > 100 ORDER BY reg_date DESC LIMIT 1`).get()
console.log('제목:', book.title)
console.log('내용:', book.description)
