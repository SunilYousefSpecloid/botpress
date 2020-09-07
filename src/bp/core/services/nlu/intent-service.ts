import * as sdk from 'botpress/sdk'
import { FlowView } from 'common/typings'
import { sanitizeFileName } from 'core/misc/utils'
import _ from 'lodash'

import { GhostService } from '..'

import { NLUService } from './nlu-service'

const INTENTS_DIR = './intents'
const FLOWS_DIR = './flows'

export class IntentService {
  constructor(private ghostService: GhostService, private nluService: NLUService) {}

  private async intentExists(botId: string, intentName: string): Promise<boolean> {
    return this.ghostService.forBot(botId).fileExists(INTENTS_DIR, `${intentName}.json`)
  }

  public async getIntents(botId: string): Promise<sdk.NLU.IntentDefinition[]> {
    const intentNames = await this.ghostService.forBot(botId).directoryListing(INTENTS_DIR, '*.json')
    const intentsFromFiles = await Promise.mapSeries(intentNames, n => this.getIntent(botId, n))
    const intentsFromFlows = await this.getIntentsFromFlows(botId)
    return [...intentsFromFiles, ...intentsFromFlows]
  }

  private async getIntentsFromFlows(botId: string): Promise<sdk.NLU.IntentDefinition[]> {
    const flowsPaths = await this.ghostService.forBot(botId).directoryListing(FLOWS_DIR, '*.flow.json')
    const flows: sdk.Flow[] = await Promise.map(flowsPaths, async (flowPath: string) => ({
      // @ts-ignore
      name: flowPath.replace(/.flow.json$/i, ''),
      ...(await this.ghostService.forBot(botId).readFileAsObject<FlowView>(FLOWS_DIR, flowPath))
    }))

    const intentsByName: Dic<sdk.NLU.IntentDefinition> = {}

    for (const flow of flows) {
      const topicName = flow.name.split('/')[0]
      const slots = flow.variables?.map(x => ({ name: x.params?.name, entity: x?.params?.subType ?? x.type })) ?? []

      for (const node of flow.nodes.filter(x => x.type === 'trigger' || x.triggers?.length)) {
        const tn = node as sdk.TriggerNode
        const conditions = tn.conditions?.filter(x => x?.id === 'user_intent_is') ?? []
        const explicitIntents = _.flatten(
          tn.triggers?.map(x => x.conditions.filter(x => x?.id === 'user_intent_is')) ?? []
        )

        for (let i = 0; i < conditions.length; i++) {
          const intentName = sanitizeFileName(`${flow.name}/${tn?.name}/${i}`)
          if (intentsByName[intentName]) {
            throw new Error(`Duplicated intent with name "${intentName}"`)
          }
          intentsByName[intentName] = {
            contexts: [topicName],
            filename: flow.name,
            name: intentName,
            slots,
            utterances: conditions[i]?.params?.utterances ?? {}
          }
        }

        for (let i = 0; i < explicitIntents.length; i++) {
          const intentName = sanitizeFileName(`${flow.name}/${tn?.name}/${conditions.length + i}`)
          if (intentsByName[intentName]) {
            throw new Error(`Duplicated intent with name "${intentName}"`)
          }
          intentsByName[intentName] = {
            contexts: [sanitizeFileName(`explicit:${flow.name}/${node.name}`)],
            filename: flow.name,
            name: intentName,
            slots,
            utterances: explicitIntents[i]?.params?.utterances ?? {}
          }
        }
      }

      // for (const node of flow.nodes.filter(x => x.type === 'say_something')) {
      //   let idx = 0
      //   for (let i = 0; i < (node.contents?.length ?? 0); i++) {
      //     node.contents![i].choices?.forEach((choice, c) => {
      //       const utterances = [choice.title, choice.value].filter(Boolean).reduce((utterances, obj) => {
      //         // TODO: convert this once we have the GUI implemented
      //         for (const lang of Object.keys(obj)) {
      //           if (!utterances[lang]) {
      //             utterances[lang] = []
      //           }
      //           utterances[lang] = [...utterances[lang], obj[lang]]
      //         }

      //         return utterances
      //       }, {})

      //       if (Object.keys(utterances)) {
      //         const intentName = sanitizeFileName(`${flow.name}/${node.name}/${idx++}`) // TODO: change this for user_isdetection
      //         const contextName = sanitizeFileName(`explicit:${flow.name}/${node.name}`)
      //         intentsByName[intentName] = {
      //           contexts: [contextName],
      //           filename: flow.name,
      //           name: intentName,
      //           slots: [],
      //           utterances: utterances
      //         }
      //       }
      //     })
      //   }
      // }
      //
    }

    return Object.values(intentsByName)
  }
  // TODO: move the built-in "Yes", "No", "Cancel" in /library/built-in.intents.json then get rid of thisfunction
  public async getIntent(botId: string, intentName: string): Promise<sdk.NLU.IntentDefinition> {
    intentName = sanitizeFileName(intentName)
    if (intentName.length < 1) {
      throw new Error('Invalid intent name, expected at least one character')
    }

    if (!(await this.intentExists(botId, intentName))) {
      throw new Error('Intent does not exist')
    }
    return this.ghostService.forBot(botId).readFileAsObject(INTENTS_DIR, `${intentName}.json`)
  }

  public async saveIntent(botId: string, intent: sdk.NLU.IntentDefinition): Promise<sdk.NLU.IntentDefinition> {
    const name = sanitizeFileName(intent.name)
    if (name.length < 1) {
      throw new Error('Invalid intent name, expected at least one character')
    }

    const availableEntities = await this.nluService.entities.getEntities(botId)

    _.chain(intent.slots)
      .flatMap('entities')
      .uniq()
      .forEach(entity => {
        if (!availableEntities.find(e => e.name === entity)) {
          throw Error(`"${entity}" is neither a system entity nor a custom entity`)
        }
      })

    await this.ghostService.forBot(botId).upsertFile(INTENTS_DIR, `${name}.json`, JSON.stringify(intent, undefined, 2))
    return intent
  }

  public async updateIntent(
    botId: string,
    name: string,
    content: Partial<sdk.NLU.IntentDefinition>
  ): Promise<sdk.NLU.IntentDefinition> {
    const intentDef = await this.getIntent(botId, name)
    const merged = _.merge(intentDef, content) as sdk.NLU.IntentDefinition
    if (content?.name !== name) {
      await this.deleteIntent(botId, name)
      name = <string>content.name
    }
    return this.saveIntent(botId, merged)
  }

  public async deleteIntent(botId: string, intentName: string): Promise<void> {
    intentName = sanitizeFileName(intentName)

    if (!(await this.intentExists(botId, intentName))) {
      throw new Error('Intent does not exist')
    }

    return this.ghostService.forBot(botId).deleteFile(INTENTS_DIR, `${intentName}.json`)
  }

  // ideally this would be a filewatcher
  public async updateIntentsSlotsEntities(botId: string, prevEntityName: string, newEntityName: string): Promise<void> {
    _.each(await this.getIntents(botId), async intent => {
      let modified = false
      _.each(intent.slots, slot => {
        if (slot.entity === prevEntityName) {
          slot.entity = newEntityName
          modified = true
        }
      })
      if (modified) {
        await this.updateIntent(botId, intent.name, intent)
      }
    })
  }

  /**
   * This method read every workflow to extract their intent usage, so they can be in sync with their topics.
   * The list of intent names is not required, but it saves some processing
   */
  public async updateContextsFromTopics(botId: string, intentNames?: string[]): Promise<void> {
    const flowsPaths = await this.ghostService.forBot(botId).directoryListing('flows', '*.flow.json')
    const flows: sdk.Flow[] = await Promise.map(flowsPaths, async (flowPath: string) => ({
      // @ts-ignore
      name: flowPath,
      ...(await this.ghostService.forBot(botId).readFileAsObject<FlowView>('flows', flowPath))
    }))

    const intents: { [intentName: string]: string[] } = {}

    for (const flow of flows) {
      const topicName = flow.name.split('/')[0]

      for (const node of flow.nodes.filter(x => x.type === 'trigger')) {
        const tn = node as sdk.TriggerNode
        const match = tn.conditions.find(x => x.id === 'user_intent_is')
        const name = match?.params?.intentName as string

        if (name && name !== 'none' && (!intentNames || intentNames.includes(name))) {
          intents[name] = _.uniq([...(intents[name] || []), topicName])
        }
      }
    }

    for (const intentName of Object.keys(intents)) {
      const intentDef = await this.getIntent(botId, intentName)

      if (!_.isEqual(intentDef.contexts.sort(), intents[intentName].sort())) {
        intentDef.contexts = intents[intentName]
        await this.saveIntent(botId, intentDef)
      }
    }
  }
}
