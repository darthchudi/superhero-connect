import { Request, Response } from 'express';
import { default as Superhero } from '../models/Superhero';
import {
  default as FriendRequest,
  FriendRequestDocument,
} from '../models/FriendRequest';
import { decodeToken } from '../helpers';
import { validateSuperheroInput } from '../helpers/validator';
import { valid } from 'joi';
import jwt from 'jsonwebtoken';

export async function createSuperHero(req: Request, res: Response) {
  const {
    error: validationError,
    value: validatedInput,
  } = validateSuperheroInput(req.body);

  if (validationError) {
    res.status(401).json(validationError.details);
    return;
  }

  const existingHero = await Superhero.findOne({
    superheroName: validatedInput.superheroName,
  });

  if (existingHero) {
    res.status(401).json({
      message: 'Super hero name is taken already',
    });
    return;
  }

  const newSuperhero = new Superhero(validatedInput);
  newSuperhero.save((err, superhero) => {
    if (err) {
      res.status(500).json({
        message: 'Could not create superhero',
      });
      return;
    }

    var response = superhero.toObject();
    delete response.password;

    res.status(200).json(response);
    return;
  });
}

export function loginSuperhero(req: Request, res: Response) {
  const superheroName = req.body.superheroName;
  const plainText = req.body.password;
  const loginSuperhero = Superhero.findOne(
    { superheroName },
    (err, superhero): any => {
      if (err) return res.status(500).json({ message: 'An error occured' });

      if (!superhero)
        return res.status(404).json({ message: 'Superhero does not exist' });

      superhero.comparePassword(
        plainText,
        (err: any, isMatch: boolean): any => {
          if (err) return res.status(500).json({ message: 'An error occured' });

          if (!isMatch)
            return res.status(401).json({ message: 'Invalid Password' });

          const response = superhero.toObject();
          delete response.password;

          const token = jwt.sign({ response }, <string>process.env.JWT_SECRET, {
            expiresIn: '3h',
          });

          res.status(200).json({
            token,
          });
        }
      );
    }
  );
}

export function getSuperHero(req: Request, res: Response) {
  let superhero: object = {};
  try {
    superhero = decodeToken(<string>req.headers.authorization);
    return res.status(200).json({ superhero });
  } catch (e) {
    res.status(401).json({ message: 'Token has either expired or is invalid' });
    return;
  }
}

export async function getAllSuperheros(_req: Request, res: Response) {
  try {
    const query = Superhero.find();
    query.select('-password');
    const response = await query.exec();
    return res.status(200).json({ response });
  } catch (e) {
    return res.status(500).json({ message: e });
  }
}

export async function getSuperheroFriends(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const superhero = await Superhero.findById(id);
    if (superhero) {
      const { superheroName, friends } = superhero;
      return res.status(200).json({ id, superheroName, friends });
    } else {
      return res.status(404).json({ message: 'Superhero not found' });
    }
  } catch (e) {
    return res.status(500).json({ message: e });
  }
}
