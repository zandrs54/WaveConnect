import { Router } from "express"
import { dirname } from "path"
import { fileURLToPath } from "url"
import { join } from "path"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const router = Router()
router.get('/', (req, res) => {
    const filePath = join(__dirname, '..', 'web', 'regPage.html');
    res.sendFile(filePath)
})

export default router