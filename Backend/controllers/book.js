const Book = require('../models/Book');
const fs = require('fs');
const sharp = require('sharp')

exports.getAllBooks = (req, res, next) => {
    Book.find()
      .then(books => res.status(200).json(books))
      .catch(error => res.status(400).json({ error }));
};
  
  exports.getOneBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
      .then(book => res.status(200).json(book))
      .catch(error => res.status(404).json({ error }));
};

exports.createBook = async (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  delete bookObject._userId;
  await sharp(req.file.path).resize(500).jpeg({quality:80}).toFile(req.file.destination,"resized",req.file.filename).then(() => {fs.unlinkSync(req.file.path)}).catch((error) => console.log(error))
  
  const book = new Book({
      ...bookObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  book.save()
  .then(() => { res.status(201).json({message: 'Objet enregistré !'})})
  .catch(error => { res.status(400).json( { error })})
};

exports.modifyBook = (req, res, next) => {
// if (req.params.id == req.body.userId ) {
// if (req.body.userId == req.params) {
const bookObject = req.file ? {
      ...JSON.parse(req.body.book),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

    // const bookMaj = Book.findOne({_id: req.params.id})
    // bookObject.userId = req.auth.userId
    // const AutorizedUser = bookMaj.userId === req.auth.userId

//   if (!AutorizedUser) {return res.status(403).json({ message : "Not authorized"})}

  delete bookObject._userId;
  Book.findOne({_id: req.params.id})
      .then((book) => {
        if (book.userId != req.auth.userId) {
        res.status(401).json({ message : 'Not authorized'});
          } else {
            if (req.body.author == "") {return res.status(400).json({message : 'Champ Auteur vide' })}
            if (req.body.genre == "") {return res.status(400).json({message : 'Champ Genre vide' })}
            if (req.body.title == "") {return res.status(400).json({message : 'Champ Titre vide' })}
            if (req.body.year == "") {return res.status(400).json({message : 'Champ Année de publication vide' })}

              Book.updateOne({ _id: req.params.id}, { ...bookObject, _id: req.params.id})
              .then(() => res.status(200).json({message : 'Objet modifié!'}))
              .catch(error => res.status(401).json({ error }));
          }
      })
      .catch((error) => {
          res.status(400).json({ error });
      });
    // } else {res.status(403).json({message : 'Interdit'})}
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id})
      .then(book => {
          if (book.userId != req.auth.userId) {
              res.status(401).json({message: 'Not authorized'});
          } else {
              const filename = book.imageUrl.split('/images/')[1];
              fs.unlink(`images/${filename}`, () => {
                  Book.deleteOne({_id: req.params.id})
                      .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
                      .catch(error => res.status(401).json({ error }));
              });
          }
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};

exports.bookRating = (req, res, next) => {
    const userId = req.body.userId
    const rating = req.body.rating
    Book.findById(req.params.id)
    .then ((book) => {
        if (!book) {return res.status(404).json({message: "Le livre n'a pas été trouvé"})}
        if (book.ratings.find((rating) => rating.userId === req.body.userId)) {return res.status(400).json({message: "Vous avez deja notez ce livre"})}
        else {
            book.ratings.push({userId: userId, grade: rating})
            const totalRatings = book.ratings.length
            const sumRatings = book.ratings.reduce((sum,rating) => sum + rating.grade, 0)
            book.averageRating = Math.round (sumRatings / totalRatings)
            book.save()
            .then((book) => res.status(200).json(book))
            .catch(error => res.status(400).json({ error }))
            } 
            // if (req.body.rating != "") {
            // book.id = req.params.id
            // getBestBooks(book.id)
            // }
    })
    .catch (error => res.status(500).json({ error }))
}

exports.getBestBooks = (req, res, next) => {
    Book.find().sort({averageRating : -1}).limit(3)
    .then((books) => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }))
}