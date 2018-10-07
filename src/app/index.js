/* eslint-disable class-methods-use-this */
const chalk = require('chalk');
const del = require('del');
const fs = require('fs');
const path = require('path');

import Generator from 'yeoman-generator';
import kebabcase from 'lodash/kebabcase';
import Remote from '../_utils/Remote';

/**
 * Main generator.
 *
 * @export
 * @class BootstrapApp
 * @extends {Generator}
 */
export default class BootstrapApp extends Generator {
  /**
   * Creates an instance of BootstrapApp.
   * @param {Object} args options
   * @param {Object} opts arguments
   *
   * @memberof EpicApp
   */
  constructor(args, opts) {
    // Avoid confirm message for delete/overwrite files
    opts.force = true;

    super(args, opts);

    this.option('test', {
      type: String,
      required: false,
      desc: 'Test mode',
    });

    this.option('dev', {
      type: String,
      required: false,
      desc: 'Dev mode',
    });

    this.props = {};
  }

  get initializing() {
    return {
      /**
       * Start yo timer.
       * @returns {undefined}
       */
      start() {
        console.time('yo');
      },

      /**
       * Log options infos.
       * @returns {undefined}
       */
      checkOptions() {
        if (this.options.test) {
          this.log(chalk.cyan('> Mode test [ON]'));
        }

        if (this.options.dev) {
          this.log(chalk.cyan('> Mode dev [ON]'));
        }
      },
    };
  }

  get prompting() {
    return {
      askForProjectName() {
        this.props.project = {};

        const prompts = [
          {
            name: 'projectName',
            message: 'Project name: ',
            default: '',
          },
        ];

        return this
          .prompt(prompts)
          .then(answers => {
            this.props.project.name = answers.projectName;
            this.props.project.dir = kebabcase(answers.projectName);
            console.info('NAME', this.props.project.name);
            console.info('DIR', this.props.project.dir);
          });
      },

      askForSchoolYear() {
        const prompts = [{
          name: 'schoolYear',
          type: 'list',
          message: 'In which year of study',
          choices: [
            {
              name: 'B2G*',
              value: 2,
            },
            {
              name: 'B3G*',
              value: 3,
            },
          ],
        }];

        return this
          .prompt(prompts)
          .then(answers => {
            switch (answers.schoolYear) {
              case 2:
              default:
                this.props.project.workflow = 'gulp-elixir';
                break;
              case 3:
                this.props.project.workflow = 'parcel';
                break;
            }
            console.info('YEAR', answers.schoolYear);
            console.info('WORKFLOW', this.props.project.workflow);
          });
      },
    };
  }

  get configuring() {
    return {
      dir() {
        // Create project directory
        const folder = this.props.project.dir;

        if (fs.existsSync(folder)) {
          this.env.error(`
> ${chalk.red(`Ooops! Non-empty directory! [${process.cwd()}/${folder}]`)}
> ${chalk.red('I don\'t want to erase your stuff… 😅')}
> ${chalk.red('Retry with another name/location')}
          `);
        } else {
          fs.mkdirSync(this.props.project.name);
        }
      },
    };
  }

  get writing() {
    return {
      files() {
        const done = this.async();
        const dest = this.props.project.dir;

        // DEV
        // new Remote('workflow', 'master', (err, cache) => {
        // eslint-disable-next-line no-new
        new Remote('dwm-gulp-elixir', 'master', (err, cache) => {
          this.cache = cache;

          // Copy folders
          this.fs.copy(
            `${cache}/**/*`,
            this.destinationPath(`${dest}/`)
          );

          done();
        });
      },
    };
  }

  install() {
    const dest = this.props.project.dir;

    process.chdir(path.join(process.cwd(), dest));
    this.log(`> ${chalk.cyan('📦 Installing dependencies with `npm i`')}`);
    this.npmInstall();
  }

  get end() {
    return {
      clean() {
        // DEV
        // this.log(`> ${chalk.cyan(`🗑  Cache deleted: ${this.cache}`)}`);
        this.log(`> ${chalk.cyan('🗑  Deleting cache')}`);

        return del(this.cache, { force: true });
      },

      bye() {
        this.log(`> ${chalk.cyan('🚀 Almost done! Copy-paste next line and happy coding!')}`);
        this.log(chalk.green(`cd ${this.props.project.dir} && npm start`));
        console.timeEnd('yo');
      },
    };
  }
}
