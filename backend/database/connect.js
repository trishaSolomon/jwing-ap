import { MongoClient } from 'mongodb'

let connection

// Reuse one MongoClient and its connection pool across requests.
export function connectToDatabase() {
    if (connection) return connection
    if (!process.env.MONGODB_URI) {
        return Promise.reject(new Error('MONGODB_URI is not configured'))
    }

    connection = Promise.resolve().then(async () => {
        const client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        })
        try {
            await client.connect()
            return client.db()
        } catch (error) {
            await client.close()
            throw error
        }
    }).catch(error => {
        connection = undefined
        throw error
    })

    return connection
}
