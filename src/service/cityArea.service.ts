import { Area } from '@prisma/client'
import { prisma } from '../server';

class CityAreaService {
    public getAreaOfCity(cityId: number): Promise<Area> {
        return prisma.city.findOne({ 
            where: { id: cityId }, 
            include: { area: true } 
        }).area();
    }
}

const _ = new CityAreaService();
export { _ as CityAreaService }