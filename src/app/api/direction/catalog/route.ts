import { directionResponse } from "@/features/direction/services/direction-http.service";
import {
  directionUser,
  directionFailure,
} from "@/features/direction/services/direction-http.service";
import { METRIC_CATALOG } from "@/features/direction/measurements/constants/metric-catalog.constants";
export async function GET(request: Request) {
  try {
    await directionUser(request);
    return directionResponse({ items: METRIC_CATALOG });
  } catch (error) {
    return directionFailure(error);
  }
}
