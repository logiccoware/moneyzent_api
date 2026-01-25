import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TagController } from "@/modules/tag/tag.controller";
import { TagService } from "@/modules/tag/tag.service";
import { TagEntity } from "@/modules/tag/tag.entity";

@Module({
	imports: [TypeOrmModule.forFeature([TagEntity])],
	controllers: [TagController],
	providers: [TagService],
	exports: [TagService],
})
export class TagModule {}
