import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoryController } from "@/modules/category/category.controller";
import { CategoryService } from "@/modules/category/category.service";
import { CategoryEntity } from "@/modules/category/category.entity";

@Module({
	imports: [TypeOrmModule.forFeature([CategoryEntity])],
	controllers: [CategoryController],
	providers: [CategoryService],
	exports: [CategoryService],
})
export class CategoryModule {}
