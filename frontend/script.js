// Fetch items from the API and populate the content div.
const getData = async () => {
    const content = document.querySelector('#content')

    try {
        const response = await fetch('/api/items')
        if (!response.ok) throw new Error('Unable to load data')
        const data = await response.json()

        content.replaceChildren()
        const heading = document.createElement('h3')
        heading.textContent = '✅ MongoDB connected.'
        content.appendChild(heading)
        console.log(data)

        if (!data.length) {
            const notice = document.createElement('p')
            notice.textContent = 'No documents found. Check the database and collection name.'
            content.appendChild(notice)
        }

        data.forEach(item => {
            const title = document.createElement('p')
            title.textContent = item.title ?? 'Untitled item'
            content.appendChild(title)
        })
    } catch (error) {
        content.textContent = '❌ Unable to load data. Check the database configuration and server logs.'
        console.error(error)
    }
}

getData()
