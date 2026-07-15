import { createListHandler } from '../../_lib/crudFactory.js'
import { withSentry } from '../../_lib/sentry.js'

export default withSentry(createListHandler())