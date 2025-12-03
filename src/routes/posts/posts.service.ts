import { Injectable } from '@nestjs/common'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { PrismaService } from 'src/shared/services/prisma.service'
import { envConfig } from 'src/shared/config'

@Injectable()
export class PostsService {
  constructor(private readonly prismaService: PrismaService) {}
  create(body: any) {
    const userId = 1
    return this.prismaService.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    })
  }

  findAll() {
    return this.prismaService.post.findMany()
  }

  findOne(id: number) {
    return `This action returns a #${id} post`
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`
  }

  remove(id: number) {
    return `This action removes a #${id} post`
  }
}
