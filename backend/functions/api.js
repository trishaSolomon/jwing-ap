import express from 'express'
import serverless from 'serverless-http'
import { connectToDatabase } from '../database/connect.js'

// Choose an existing collection and a string field to use for searching.
const collectionName = 'movies'

export const app = express()
const router = express.Router()

// Publish up to 10 documents 
router.get('/items', async (req, res) => {
    const db = await connectToDatabase()
    const items = await db.collection(collectionName)
        .find({})
        .limit(10)
        .toArray()
    res.json(items)
})

// Search using a case-insensitive, literal substring.
router.get('/search', async (req, res) => {
    const terms = req.query.terms ?? ''
    
    if (typeof terms !== 'string') {
        return res.status(400).json({ error: 'Search terms must be a string' })
    }
 
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp

    const db = await connectToDatabase()
    const items = await db.collection(collectionName)
        .find({ 
            // title: terms
            title: RegExp(terms , 'i')   // JavaScript RegExp syntax is supported by MongoDB
        }) 
        .limit(10)
        .toArray()
    res.json(items)
})
  
app.use('/api', router)

app.use((error, req, res, next) => {
    console.error('Database request failed:', error.message)
    res.status(500).json({ error: 'Unable to load data. Check the server database configuration.' })
})

// Export our Express app for Netlify so that it can run as a serverless function 
export const handler = serverless(app)

// Start Express directly during local development (i.e. when not using Netlify)
if (!process.env.NETLIFY) {
    app.use(express.static('frontend'))
    const port = process.env.PORT || 3000

    connectToDatabase()
        .then(() => {
            const server = app.listen(port, () => {
                console.log(`API running at http://localhost:${port}`)
            })
        })
        .catch(error => {
            console.error(`Unable to connect to MongoDB: ${error.message}`)
            process.exitCode = 1
        })
}
