const Tournament = require('../models/Tournament');

exports.getTournaments = async (req, res) => {

  try {

    const data = await Tournament.find();

    res.json(data);

  } catch (err) {

    res.status(500).json(err);
  }
};

exports.createTournament = async (req, res) => {

  try {

    const newData = new Tournament(req.body);

    await newData.save();

    res.json(newData);

  } catch (err) {

    res.status(500).json(err);
  }
};

exports.updateTournament = async (req, res) => {

  try {

    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after' }
    );

    res.json(updated);

  } catch (err) {

    res.status(500).json(err);
  }
};

exports.deleteTournament = async (req, res) => {

  try {

    await Tournament.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Tournament deleted'
    });

  } catch (err) {

    res.status(500).json(err);
  }
};