const express = require('express');
const router = express.Router();
const auth    = require('../middleware/auth');
const { getAll, getOne, create, update, remove } = require('../controllers/mangaController');

router.use(auth);

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;