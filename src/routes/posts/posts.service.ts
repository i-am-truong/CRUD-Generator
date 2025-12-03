import { Injectable, NotFoundException } from '@nestjs/common'
import { UpdatePostDto } from './dto/update-post.dto'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreatePostBodyDTO } from './post.dto'
import { isNotFoundPrismaError } from 'src/shared/helper'

@Injectable()
export class PostsService {
  constructor(private readonly prismaService: PrismaService) {}
  create(userId: number, body: CreatePostBodyDTO) {
    return this.prismaService.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
      include: {
        author: {
          omit: {
            password: true,
          },
        },
      },
    })
  }

  findAll(userId: number) {
    return this.prismaService.post.findMany({
      where: { authorId: userId },
      include: {
        author: {
          omit: {
            password: true,
          },
        },
      },
    })
  }

  async findOne(postId: number) {
    try {
      const post = await this.prismaService.post.findUniqueOrThrow({
        where: { id: postId },
        include: {
          author: {
            omit: {
              password: true,
            },
          },
        },
      })
      return post
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundException('Post not found')
      }
      throw error
    }
  }

  async update({ postId, userId, body }: { postId: number; body: CreatePostBodyDTO; userId: number }) {
    try {
      const post = await this.prismaService.post.update({
        where: { id: postId, authorId: userId },
        data: {
          title: body.title,
          content: body.content,
        },
        include: {
          author: {
            omit: {
              password: true,
            },
          },
        },
      })
      return post
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundException('Post not found')
      }
      throw error
    }
  }

  async remove({ postId, userId }: { postId: number; userId: number }) {
    try {
      await this.prismaService.post.delete({
        where: { id: postId, authorId: userId },
      })
      return true
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundException('Post not found')
      }
      throw error
    }
  }
}
