import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Put } from '@nestjs/common'
import { PostsService } from './posts.service'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType, ConditionGuard } from 'src/shared/constants/auth.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { CreatePostBodyDTO, GetPostItemDTO, UpdatePostBodyDTO } from './post.dto'

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @Auth([AuthType.Bearer])
  async create(@Body() body: CreatePostBodyDTO, @ActiveUser('userId') userId: number) {
    return new GetPostItemDTO(await this.postsService.create(userId, body))
  }

  @Auth([AuthType.Bearer, AuthType.APIKey], { condition: ConditionGuard.And })
  @Get()
  async findAll(@ActiveUser('userId') userId: number) {
    return this.postsService.findAll(userId).then((posts) => posts.map((post) => new GetPostItemDTO(post)))
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new GetPostItemDTO(await this.postsService.findOne(+id))
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  async update(@Param('id') id: string, @Body() body: UpdatePostBodyDTO, @ActiveUser('userId') userId: number) {
    return new GetPostItemDTO(
      await this.postsService.update({
        postId: +id,
        userId,
        body,
      }),
    )
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  remove(@Param('id') id: string, @ActiveUser('userId') userId: number): Promise<boolean> {
    return this.postsService.remove({
      postId: +id,
      userId,
    })
  }
}
