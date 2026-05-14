const Achievement = require('../models/Achievement');

exports.getAchievements = async (req, res) => {

  try {

    const data = await Achievement.find();

    res.json(data);

  } catch (err) {

    res.status(500).json(err);
  }
};

exports.createAchievement = async (req, res) => {

  try {

    const newData = new Achievement(req.body);

    await newData.save();

    res.json(newData);

  } catch (err) {

    res.status(500).json(err);
  }
};

exports.updateAchievement = async (req, res) => {

  try {

    const updated = await Achievement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);

  } catch (err) {

    res.status(500).json(err);
  }
};

exports.deleteAchievement = async (req, res) => {

  try {

    await Achievement.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Achievement deleted'
    });

  } catch (err) {

    res.status(500).json(err);
  }
};