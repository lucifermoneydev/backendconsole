import { Request, Response } from 'express';
import { buildConsoleMenu } from './console.service';

export async function getConsoleMenu(req: any, res: Response) {
  try {
    const userId = req.user.userId; // from requireAuth

    const menu = await buildConsoleMenu(userId);

    return res.json({ menu });

  } catch (err: any) {
    return res.status(500).json({
      message: err.message || 'Failed to build console menu'
    });
  }
}
