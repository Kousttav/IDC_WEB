const Tournament = require('../models/Tournament');

exports.getTournaments = async (req, res) => {
  try {
    const data = await Tournament.find();
    const now  = new Date();

    const result = data.map(t => {
      const obj   = t.toObject();
      const start = obj.startDate ? new Date(obj.startDate) : null;
      const end   = obj.endDate   ? new Date(obj.endDate)   : null;

      if (start && end) {
        if (now < start)      obj.status = 'upcoming';
        else if (now > end)   obj.status = 'completed';
        else                  obj.status = 'live';
      } else if (start && !end) {
        obj.status = now < start ? 'upcoming' : 'live';
      }
      return obj;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.createTournament = async (req, res) => {
  try {
    const body = { ...req.body };

    const now   = new Date();
    const start = body.startDate ? new Date(body.startDate) : null;
    const end   = body.endDate   ? new Date(body.endDate)   : null;

    if (start && end) {
      if (now < start)     body.status = 'upcoming';
      else if (now > end)  body.status = 'completed';
      else                 body.status = 'live';
    } else if (start && !end) {
      body.status = now < start ? 'upcoming' : 'live';
    }

    const newData = new Tournament(body);
    await newData.save();
    res.json(newData);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const body = { ...req.body };

    // Compute status from dates if they exist
    const now = new Date();
    const start = body.startDate ? new Date(body.startDate) : null;
    const end   = body.endDate   ? new Date(body.endDate)   : null;

    if (start && end) {
      if (now < start)       body.status = 'upcoming';
      else if (now > end)    body.status = 'completed';
      else                   body.status = 'live';
    } else if (start && !end) {
      if (now < start)       body.status = 'upcoming';
      else                   body.status = 'live';
    }
    // if no dates at all → keep whatever status override was sent in body

    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true }          // ← use `new: true` not `returnDocument: 'after'`
    );

    req.app.get('io')?.emit('tournamentUpdated', updated);  // live update if needed

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