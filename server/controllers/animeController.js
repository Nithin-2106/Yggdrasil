const Anime = require('../models/Anime');

exports.getAll = async (req, res) => {
  try {
    const anime = await Anime.find({ userId: req.user._id }).sort({ title: 1 });
    res.json(anime);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const anime = await Anime.findOne({ _id: req.params.id, userId: req.user._id });
    if (!anime) return res.status(404).json({ message: 'Not found' });
    res.json(anime);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const anime = await Anime.create({ ...req.body, userId: req.user._id });
    res.status(201).json(anime);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const anime = await Anime.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!anime) return res.status(404).json({ message: 'Not found' });
    res.json(anime);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    const anime = await Anime.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!anime) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};