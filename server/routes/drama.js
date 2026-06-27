const express = require('express');
const router = express.Router();
const auth    = require('../middleware/auth');
const { getAll, getOne, create, update, remove } = require('../controllers/dramaController');

router.use(auth);   // all drama routes require login

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;